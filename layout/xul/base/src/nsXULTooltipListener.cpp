/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#include "nsXULTooltipListener.h"

#include "nsIDOMMouseEvent.h"
#include "nsIDOMEventTarget.h"
#include "nsIDOMDocument.h"
#include "nsIDOMXULDocument.h"
#include "nsIDOMXULElement.h"
#include "nsIDocument.h"
#include "nsIFocusController.h"
#include "nsXULAtoms.h"
#include "nsIPresShell.h"
#include "nsIFrame.h"
#include "nsIPopupBoxObject.h"
#include "nsIServiceManager.h"
#ifdef MOZ_XUL
#include "nsIDOMNSDocument.h"
#include "nsITreeView.h"
#endif
#include "nsGUIEvent.h"
#include "nsIPrivateDOMEvent.h"
#include "nsPIDOMWindow.h"
#include "nsPresContext.h"
#include "nsIScriptContext.h"
#include "nsIScriptGlobalObject.h"
#include "nsIDOMWindowInternal.h"
#include "nsContentUtils.h"

//////////////////////////////////////////////////////////////////////////
//// nsISupports

nsXULTooltipListener::nsXULTooltipListener()
  : mSourceNode(nsnull)
  , mTargetNode(nsnull)
  , mCurrentTooltip(nsnull)
  , mMouseClientX(0)
  , mMouseClientY(0)
#ifdef MOZ_XUL
  , mIsSourceTree(PR_FALSE)
  , mNeedTitletip(PR_FALSE)
  , mLastTreeRow(-1)
#endif
{
  if (sTooltipListenerCount++ == 0) {
    // register the callback so we get notified of updates
    nsContentUtils::RegisterPrefCallback("browser.chrome.toolbar_tips",
                                         ToolbarTipsPrefChanged, nsnull);

    // Call the pref callback to initialize our state.
    ToolbarTipsPrefChanged("browser.chrome.toolbar_tips", nsnull);
  }
}

nsXULTooltipListener::~nsXULTooltipListener()
{
  HideTooltip();

  if (--sTooltipListenerCount == 0) {
    // Unregister our pref observer
    nsContentUtils::UnregisterPrefCallback("browser.chrome.toolbar_tips",
                                           ToolbarTipsPrefChanged, nsnull);
  }
}

NS_IMPL_ADDREF(nsXULTooltipListener)
NS_IMPL_RELEASE(nsXULTooltipListener)

NS_INTERFACE_MAP_BEGIN(nsXULTooltipListener)
  NS_INTERFACE_MAP_ENTRY(nsIDOMMouseListener)
  NS_INTERFACE_MAP_ENTRY(nsIDOMMouseMotionListener)
  NS_INTERFACE_MAP_ENTRY(nsIDOMKeyListener)
  NS_INTERFACE_MAP_ENTRY(nsIDOMXULListener)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsIDOMEventListener, nsIDOMMouseListener)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIDOMMouseMotionListener)
NS_INTERFACE_MAP_END

//////////////////////////////////////////////////////////////////////////
//// nsIDOMMouseListener

NS_IMETHODIMP
nsXULTooltipListener::MouseDown(nsIDOMEvent* aMouseEvent)
{
  HideTooltip();

  return NS_OK;
}

NS_IMETHODIMP
nsXULTooltipListener::MouseUp(nsIDOMEvent* aMouseEvent)
{
  HideTooltip();

  return NS_OK;
}

NS_IMETHODIMP
nsXULTooltipListener::MouseOut(nsIDOMEvent* aMouseEvent)
{
  // if the timer is running and no tooltip is shown, we
  // have to cancel the timer here so that it doesn't 
  // show the tooltip if we move the mouse out of the window
  if (mTooltipTimer && !mCurrentTooltip) {
    mTooltipTimer->Cancel();
    mTooltipTimer = nsnull;
    return NS_OK;
  }

#ifdef DEBUG_crap
  if (mNeedTitletip)
    return NS_OK;
#endif

  // check to see if the mouse left the targetNode, and if so,
  // hide the tooltip
  if (mCurrentTooltip) {
    // which node did the mouse leave?
    nsCOMPtr<nsIDOMEventTarget> eventTarget;
    aMouseEvent->GetTarget(getter_AddRefs(eventTarget));
    nsCOMPtr<nsIDOMNode> targetNode(do_QueryInterface(eventTarget));

    // which node is our tooltip on?
    nsCOMPtr<nsIDOMXULDocument2> xulDoc(do_QueryInterface(mCurrentTooltip->GetDocument()));
    if (!xulDoc)     // remotely possible someone could have 
      return NS_OK;  // removed tooltip from dom while it was open
    nsCOMPtr<nsIDOMNode> tooltipNode;
    xulDoc->TrustedGetTooltipNode (getter_AddRefs(tooltipNode));

    // if they're the same, the mouse left the node the tooltip appeared on,
    // close the tooltip.
    if (tooltipNode == targetNode) {
      HideTooltip();
#ifdef MOZ_XUL
      // reset special tree tracking
      if (mIsSourceTree) {
        mLastTreeRow = -1;
        mLastTreeCol = nsnull;
      }
#endif
    }
  }

  return NS_OK;
}

//////////////////////////////////////////////////////////////////////////
//// nsIDOMMouseMotionListener

NS_IMETHODIMP
nsXULTooltipListener::MouseMove(nsIDOMEvent* aMouseEvent)
{
  if (!sShowTooltips)
    return NS_OK;

  // stash the coordinates of the event so that we can still get back to it from within the 
  // timer callback. On win32, we'll get a MouseMove event even when a popup goes away --
  // even when the mouse doesn't change position! To get around this, we make sure the
  // mouse has really moved before proceeding.
  nsCOMPtr<nsIDOMMouseEvent> mouseEvent(do_QueryInterface(aMouseEvent));
  PRInt32 newMouseX, newMouseY;
  mouseEvent->GetClientX(&newMouseX);
  mouseEvent->GetClientY(&newMouseY);
  if (mMouseClientX == newMouseX && mMouseClientY == newMouseY)
    return NS_OK;
  mMouseClientX = newMouseX;
  mMouseClientY = newMouseY;

#ifdef MOZ_XUL
  if (mIsSourceTree)
    CheckTreeBodyMove(mouseEvent);
#endif

  // as the mouse moves, we want to make sure we reset the timer to show it, 
  // so that the delay is from when the mouse stops moving, not when it enters
  // the node.
  KillTooltipTimer();
    
  // If the mouse moves while the tooltip is up, don't do anything. We make it
  // go away only if it times out or leaves the target node. If nothing is
  // showing, though, we have to do the work.
  if (!mCurrentTooltip) {
    mTooltipTimer = do_CreateInstance("@mozilla.org/timer;1");
    if (mTooltipTimer) {
      nsCOMPtr<nsIDOMEventTarget> eventTarget;
      aMouseEvent->GetTarget(getter_AddRefs(eventTarget));
      if (eventTarget) {
        nsCOMPtr<nsIContent> targetContent(do_QueryInterface(eventTarget));
        mTargetNode = targetContent;
      }
      if (mTargetNode) {
        nsresult rv = mTooltipTimer->InitWithFuncCallback(sTooltipCallback, this, 
                                                          kTooltipShowTime, nsITimer::TYPE_ONE_SHOT);
        if (NS_FAILED(rv))
          mTargetNode = nsnull;
      }
    }
  }

  return NS_OK;
}

//////////////////////////////////////////////////////////////////////////
//// nsIDOMKeyListener

NS_IMETHODIMP
nsXULTooltipListener::KeyDown(nsIDOMEvent* aKeyEvent)
{
  HideTooltip();
  return NS_OK;
}

//////////////////////////////////////////////////////////////////////////
//// nsIDOMEventListener


NS_IMETHODIMP
nsXULTooltipListener::HandleEvent(nsIDOMEvent* aEvent)
{
  nsAutoString type;
  aEvent->GetType(type);
  if (type.EqualsLiteral("DOMMouseScroll"))
    HideTooltip();
  return NS_OK;
}

//////////////////////////////////////////////////////////////////////////
//// nsXULTooltipListener

// static
int
nsXULTooltipListener::ToolbarTipsPrefChanged(const char *aPref,
                                             void *aClosure)
{
  sShowTooltips = nsContentUtils::GetBoolPref("browser.chrome.toolbar_tips",
                                              sShowTooltips);

  return 0;
}

NS_IMETHODIMP
nsXULTooltipListener::PopupHiding(nsIDOMEvent* aEvent)
{
  DestroyTooltip();
  return NS_OK;
}

//////////////////////////////////////////////////////////////////////////
//// nsXULTooltipListener

PRBool nsXULTooltipListener::sShowTooltips = PR_FALSE;
PRUint32 nsXULTooltipListener::sTooltipListenerCount = 0;

// XXX: This could all be done in the ctor.
nsresult
nsXULTooltipListener::Init(nsIContent* aSourceNode, nsIRootBox* aRootBox)
{
  mRootBox = aRootBox;
  mSourceNode = aSourceNode;
  AddTooltipSupport(aSourceNode);
  
#ifdef MOZ_XUL
  // if the target is an treechildren, we may have some special
  // case handling to do
  mIsSourceTree = mSourceNode->Tag() == nsXULAtoms::treechildren;
#endif

  return NS_OK;
}

nsresult
nsXULTooltipListener::AddTooltipSupport(nsIContent* aNode)
{
  if (!aNode)
    return NS_ERROR_NULL_POINTER;

  nsCOMPtr<nsIDOMEventTarget> evtTarget(do_QueryInterface(aNode));
  evtTarget->AddEventListener(NS_LITERAL_STRING("mouseout"), (nsIDOMMouseListener*)this, PR_FALSE);
  evtTarget->AddEventListener(NS_LITERAL_STRING("mousemove"), (nsIDOMMouseListener*)this, PR_FALSE);
  
  return NS_OK;
}

nsresult
nsXULTooltipListener::RemoveTooltipSupport(nsIContent* aNode)
{
  if (!aNode)
    return NS_ERROR_NULL_POINTER;

  nsCOMPtr<nsIDOMEventTarget> evtTarget(do_QueryInterface(aNode));
  evtTarget->RemoveEventListener(NS_LITERAL_STRING("mouseout"), (nsIDOMMouseListener*)this, PR_FALSE);
  evtTarget->RemoveEventListener(NS_LITERAL_STRING("mousemove"), (nsIDOMMouseListener*)this, PR_FALSE);

  return NS_OK;
}

#ifdef MOZ_XUL
void
nsXULTooltipListener::CheckTreeBodyMove(nsIDOMMouseEvent* aMouseEvent)
{
  if (!mSourceNode)
    return;

  // get the boxObject of the documentElement of the document the tree is in
  nsCOMPtr<nsIBoxObject> bx;
  nsCOMPtr<nsIDOMDocument> doc(do_QueryInterface(mSourceNode->GetDocument()));
  if (doc) {
    nsCOMPtr<nsIDOMNSDocument> nsDoc(do_QueryInterface(doc));
    nsCOMPtr<nsIDOMElement> docElement;
    doc->GetDocumentElement(getter_AddRefs(docElement));
    if (nsDoc && docElement) {
      nsDoc->GetBoxObjectFor(docElement, getter_AddRefs(bx));
    }
  }

  nsCOMPtr<nsITreeBoxObject> obx;
  GetSourceTreeBoxObject(getter_AddRefs(obx));
  if (bx && obx) {
    PRInt32 x, y;
    aMouseEvent->GetScreenX(&x);
    aMouseEvent->GetScreenY(&y);

    PRInt32 row;
    nsCOMPtr<nsITreeColumn> col;
    nsCAutoString obj;

    // subtract off the documentElement's boxObject
    PRInt32 boxX, boxY;
    bx->GetScreenX(&boxX);
    bx->GetScreenY(&boxY);
    x -= boxX;
    y -= boxY;

    obx->GetCellAt(x, y, &row, getter_AddRefs(col), obj);

    // determine if we are going to need a titletip
    // XXX check the disabletitletips attribute on the tree content
    mNeedTitletip = PR_FALSE;
    if (row >= 0 && obj.EqualsLiteral("text")) {
      PRBool isCropped;
      obx->IsCellCropped(row, col, &isCropped);
      mNeedTitletip = isCropped;
    }

    if (mCurrentTooltip && (row != mLastTreeRow || col != mLastTreeCol)) {
      HideTooltip();
    } 

    mLastTreeRow = row;
    mLastTreeCol = col;
  }
}
#endif

nsresult
nsXULTooltipListener::ShowTooltip()
{
  // get the tooltip content designated for the target node 
  GetTooltipFor(mSourceNode, getter_AddRefs(mCurrentTooltip));
  if (!mCurrentTooltip || mSourceNode == mCurrentTooltip)
    return NS_ERROR_FAILURE; // the target node doesn't need a tooltip

  // set the node in the document that triggered the tooltip and show it
  // Make sure the document still has focus.
  nsIDocument* doc = mCurrentTooltip->GetDocument();
  if (!doc || !nsContentUtils::IsChromeDoc(doc)) {
    return NS_OK;
  }
  // old way to do doc->GetDocumentState().HasState(NS_DOCUMENT_STATE_WINDOW_INACTIVE)
  nsPIDOMWindow* win = doc->GetWindow();
  if (!win) {
    return NS_OK;
  }
  nsIFocusController *focusController = win->GetRootFocusController();
  PRBool isActive = PR_FALSE;
  if (!focusController) {
    return NS_OK;
  }
  focusController->GetActive(&isActive);
  if (!isActive) {
    return NS_OK;
  }

  nsCOMPtr<nsIDOMXULDocument> xulDoc(do_QueryInterface(doc));
  if (xulDoc) {
    // Make sure the target node is still attached to some document. 
    // It might have been deleted.
    if (mSourceNode->GetDocument()) {
#ifdef MOZ_XUL
      if (!mIsSourceTree) {
        mLastTreeRow = -1;
        mLastTreeCol = nsnull;
      }
#endif

      nsCOMPtr<nsIDOMNode> targetNode(do_QueryInterface(mTargetNode));
      xulDoc->SetTooltipNode(targetNode);
      LaunchTooltip(mSourceNode, mMouseClientX, mMouseClientY);
      mTargetNode = nsnull;

      // at this point, |mCurrentTooltip| holds the content node of
      // the tooltip. If there is an attribute on the popup telling us
      // not to create the auto-hide timer, don't.
      nsCOMPtr<nsIDOMElement> tooltipEl(do_QueryInterface(mCurrentTooltip));
      if (!tooltipEl)
        return NS_ERROR_FAILURE;
      nsAutoString noAutoHide;
      tooltipEl->GetAttribute(NS_LITERAL_STRING("noautohide"), noAutoHide);
      if (!noAutoHide.EqualsLiteral("true"))
        CreateAutoHideTimer();

      // listen for popuphidden on the tooltip node, so that we can
      // be sure DestroyPopup is called even if someone else closes the tooltip
      nsCOMPtr<nsIDOMEventTarget> evtTarget(do_QueryInterface(mCurrentTooltip));
      evtTarget->AddEventListener(NS_LITERAL_STRING("popuphiding"), 
                                  (nsIDOMMouseListener*)this, PR_FALSE);

      // listen for mousedown, mouseup, keydown, and DOMMouseScroll events at document level
      doc = mSourceNode->GetDocument();
      if (doc) {
        evtTarget = do_QueryInterface(doc);
        evtTarget->AddEventListener(NS_LITERAL_STRING("DOMMouseScroll"), 
                                    (nsIDOMMouseListener*)this, PR_TRUE);
        evtTarget->AddEventListener(NS_LITERAL_STRING("mousedown"), 
                                    (nsIDOMMouseListener*)this, PR_TRUE);
        evtTarget->AddEventListener(NS_LITERAL_STRING("mouseup"), 
                                    (nsIDOMMouseListener*)this, PR_TRUE);                                    
        evtTarget->AddEventListener(NS_LITERAL_STRING("keydown"), 
                                    (nsIDOMMouseListener*)this, PR_TRUE);
      }
    }
  }

  return NS_OK;
}

#ifdef MOZ_XUL
// XXX: "This stuff inside DEBUG_crap could be used to make tree tooltips work
//       in the future."
#ifdef DEBUG_crap
static void
GetTreeCellCoords(nsITreeBoxObject* aTreeBox, nsIContent* aSourceNode, 
                  PRInt32 aRow, nsITreeColumn* aCol, PRInt32* aX, PRInt32* aY)
{
  PRInt32 junk;
  aTreeBox->GetCoordsForCellItem(aRow, aCol, EmptyCString(), aX, aY, &junk, &junk);
  nsCOMPtr<nsIDOMXULElement> xulEl(do_QueryInterface(aSourceNode));
  nsCOMPtr<nsIBoxObject> bx;
  xulEl->GetBoxObject(getter_AddRefs(bx));
  PRInt32 myX, myY;
  bx->GetX(&myX);
  bx->GetY(&myY);
  *aX += myX;
  *aY += myY;
}
#endif

static void
SetTitletipLabel(nsITreeBoxObject* aTreeBox, nsIContent* aTooltip,
                 PRInt32 aRow, nsITreeColumn* aCol)
{
  nsCOMPtr<nsITreeView> view;
  aTreeBox->GetView(getter_AddRefs(view));

  nsAutoString label;
  view->GetCellText(aRow, aCol, label);
  
  aTooltip->SetAttr(nsnull, nsXULAtoms::label, label, PR_TRUE);
}
#endif

nsresult
nsXULTooltipListener::LaunchTooltip(nsIContent* aTarget, PRInt32 aX, PRInt32 aY)
{
  if (!mCurrentTooltip)
    return NS_OK;

  nsCOMPtr<nsIBoxObject> popupBox;
  nsCOMPtr<nsIDOMXULElement> xulTooltipEl(do_QueryInterface(mCurrentTooltip));
  if (!xulTooltipEl) {
    NS_ERROR("tooltip isn't a XUL element!");
    return NS_ERROR_FAILURE;
  }

  xulTooltipEl->GetBoxObject(getter_AddRefs(popupBox));
  nsCOMPtr<nsIPopupBoxObject> popupBoxObject(do_QueryInterface(popupBox));
  if (popupBoxObject) {
    PRInt32 x = aX;
    PRInt32 y = aY;
#ifdef MOZ_XUL
    if (mNeedTitletip) {
      nsCOMPtr<nsITreeBoxObject> obx;
      GetSourceTreeBoxObject(getter_AddRefs(obx));
#ifdef DEBUG_crap
      GetTreeCellCoords(obx, mSourceNode,
                        mLastTreeRow, mLastTreeCol, &x, &y);
#endif

      SetTitletipLabel(obx, mCurrentTooltip, mLastTreeRow, mLastTreeCol);
      mCurrentTooltip->SetAttr(nsnull, nsXULAtoms::titletip, NS_LITERAL_STRING("true"), PR_TRUE);
    } else
      mCurrentTooltip->UnsetAttr(nsnull, nsXULAtoms::titletip, PR_TRUE);
#endif

    nsCOMPtr<nsIDOMElement> targetEl(do_QueryInterface(aTarget));
    popupBoxObject->ShowPopup(targetEl, xulTooltipEl, x, y,
                              NS_LITERAL_STRING("tooltip").get(),
                              NS_LITERAL_STRING("none").get(),
                              NS_LITERAL_STRING("topleft").get());
  }

  return NS_OK;
}

nsresult
nsXULTooltipListener::HideTooltip()
{
  if (mCurrentTooltip) {
    // hide the popup through its box object
    nsCOMPtr<nsIDOMXULElement> tooltipEl(do_QueryInterface(mCurrentTooltip));
    nsCOMPtr<nsIBoxObject> boxObject;
    if (tooltipEl)
      tooltipEl->GetBoxObject(getter_AddRefs(boxObject));
    nsCOMPtr<nsIPopupBoxObject> popupObject(do_QueryInterface(boxObject));
    if (popupObject)
      popupObject->HidePopup();
  }

  DestroyTooltip();
  return NS_OK;
}

static void
GetImmediateChild(nsIContent* aContent, nsIAtom *aTag, nsIContent** aResult) 
{
  *aResult = nsnull;
  PRUint32 childCount = aContent->GetChildCount();
  for (PRUint32 i = 0; i < childCount; i++) {
    nsIContent *child = aContent->GetChildAt(i);

    if (child->Tag() == aTag) {
      *aResult = child;
      NS_ADDREF(*aResult);
      return;
    }
  }

  return;
}

nsresult
nsXULTooltipListener::GetTooltipFor(nsIContent* aTarget, nsIContent** aTooltip)
{
  if (!aTarget)
    return NS_ERROR_NULL_POINTER;

  nsCOMPtr<nsIDOMElement> targetEl(do_QueryInterface(aTarget));
  if (!targetEl)
    return NS_ERROR_FAILURE; // could be a text node or something

  // before we go on, make sure that target node still has a window
  nsCOMPtr<nsIDocument> document = aTarget->GetDocument();
  if (!document) {
    NS_ERROR("Unable to retrieve the tooltip node document.");
    return NS_ERROR_FAILURE;
  }
  nsIScriptGlobalObject *global = document->GetScriptGlobalObject();
  if (global) {
    nsIScriptContext *context = global->GetContext();

    if (context) {
      nsCOMPtr<nsIDOMWindowInternal> domWindow = do_QueryInterface(global);
      if (!domWindow)
        return NS_ERROR_FAILURE;
      else {
        PRBool needTooltip;
        targetEl->HasAttribute(NS_LITERAL_STRING("tooltiptext"), &needTooltip);
        if (needTooltip) {
          // specifying tooltiptext means we will always use the default tooltip
           mRootBox->GetDefaultTooltip(aTooltip);
           NS_IF_ADDREF(*aTooltip);
           return NS_OK;
        } else {
          nsAutoString tooltipId;
          targetEl->GetAttribute(NS_LITERAL_STRING("tooltip"), tooltipId);

          // if tooltip == _child, look for first <tooltip> child
          if (tooltipId.EqualsLiteral("_child")) {
            GetImmediateChild(aTarget, nsXULAtoms::tooltip, aTooltip);
            return NS_OK;
          } else {
            if (!tooltipId.IsEmpty()) {
              // tooltip must be an id, use getElementById to find it
              nsCOMPtr<nsIDOMDocument> domDocument =
                do_QueryInterface(document);
              if (!domDocument) {
                return NS_ERROR_FAILURE;
              }

              nsCOMPtr<nsIDOMElement> tooltipEl;
              domDocument->GetElementById(tooltipId,
                                          getter_AddRefs(tooltipEl));

              if (tooltipEl) {
#ifdef MOZ_XUL
                mNeedTitletip = PR_FALSE;
#endif

                nsCOMPtr<nsIContent> tooltipContent(do_QueryInterface(tooltipEl));
                *aTooltip = tooltipContent;
                NS_IF_ADDREF(*aTooltip);

                return NS_OK;
              }
            }
          }
        }

#ifdef MOZ_XUL
        // titletips should just use the default tooltip
        if (mIsSourceTree && mNeedTitletip) {
          mRootBox->GetDefaultTooltip(aTooltip);
          NS_IF_ADDREF(*aTooltip);
          return NS_OK;
        }
#endif
      }
    }
  }

  return NS_OK;
}

nsresult
nsXULTooltipListener::DestroyTooltip()
{
  nsCOMPtr<nsIDOMMouseListener> kungFuDeathGrip(this);
  if (mCurrentTooltip) {
    // clear out the tooltip node on the document
    nsCOMPtr<nsIDocument> doc = mCurrentTooltip->GetDocument();
    if (doc) {
      nsCOMPtr<nsIDOMXULDocument> xulDoc(do_QueryInterface(doc));
      if (xulDoc)
        xulDoc->SetTooltipNode(nsnull);

      // remove the mousedown and keydown listener from document
      nsCOMPtr<nsIDOMEventTarget> evtTarget(do_QueryInterface(doc));
      evtTarget->RemoveEventListener(NS_LITERAL_STRING("DOMMouseScroll"), (nsIDOMMouseListener*)this, PR_TRUE);
      evtTarget->RemoveEventListener(NS_LITERAL_STRING("mousedown"), (nsIDOMMouseListener*)this, PR_TRUE);
      evtTarget->RemoveEventListener(NS_LITERAL_STRING("mouseup"), (nsIDOMMouseListener*)this, PR_TRUE);
      evtTarget->RemoveEventListener(NS_LITERAL_STRING("keydown"), (nsIDOMMouseListener*)this, PR_TRUE);
    }

    // remove the popuphidden listener from tooltip
    nsCOMPtr<nsIDOMEventTarget> evtTarget(do_QueryInterface(mCurrentTooltip));

    // release tooltip before removing listener to prevent our destructor from
    // being called recursively (bug 120863)
    mCurrentTooltip = nsnull;

    evtTarget->RemoveEventListener(NS_LITERAL_STRING("popuphiding"), (nsIDOMMouseListener*)this, PR_FALSE);
  }
  
  // kill any ongoing timers
  KillTooltipTimer();
  if (mAutoHideTimer) {
    mAutoHideTimer->Cancel();
    mAutoHideTimer = nsnull;
  }

  return NS_OK;
}

void
nsXULTooltipListener::KillTooltipTimer()
{
  if (mTooltipTimer) {
    mTooltipTimer->Cancel();
    mTooltipTimer = nsnull;
    mTargetNode = nsnull;
  }
}

void
nsXULTooltipListener::CreateAutoHideTimer()
{
  if (mAutoHideTimer) {
    mAutoHideTimer->Cancel();
    mAutoHideTimer = nsnull;
  }
  
  mAutoHideTimer = do_CreateInstance("@mozilla.org/timer;1");
  if ( mAutoHideTimer )
    mAutoHideTimer->InitWithFuncCallback(sAutoHideCallback, this, kTooltipAutoHideTime, 
                                         nsITimer::TYPE_ONE_SHOT);
}

void
nsXULTooltipListener::sTooltipCallback(nsITimer *aTimer, void *aListener)
{
  nsXULTooltipListener* self = NS_STATIC_CAST(nsXULTooltipListener*, aListener);
  if (self)
    self->ShowTooltip();
}

void
nsXULTooltipListener::sAutoHideCallback(nsITimer *aTimer, void* aListener)
{
  nsXULTooltipListener* self = NS_STATIC_CAST(nsXULTooltipListener*, aListener);
  if (self) {
    nsCOMPtr<nsIDOMMouseListener> kungFuDeathGrip(self);
    self->HideTooltip();
  }
}

#ifdef MOZ_XUL
nsresult
nsXULTooltipListener::GetSourceTreeBoxObject(nsITreeBoxObject** aBoxObject)
{
  *aBoxObject = nsnull;

  if (mIsSourceTree && mSourceNode) {
    nsCOMPtr<nsIDOMXULElement> xulEl(do_QueryInterface(mSourceNode->GetParent()));
    if (xulEl) {
      nsCOMPtr<nsIBoxObject> bx;
      xulEl->GetBoxObject(getter_AddRefs(bx));
      nsCOMPtr<nsITreeBoxObject> obx(do_QueryInterface(bx));
      if (obx) {
        *aBoxObject = obx;
        NS_ADDREF(*aBoxObject);
        return NS_OK;
      }
    }
  }
  return NS_ERROR_FAILURE;
}
#endif
